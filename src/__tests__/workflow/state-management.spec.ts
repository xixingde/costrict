import { describe, it, expect, vi, beforeEach } from "vitest"
import { StateManagementService } from "../../services/state/StateManagementService"

// Mock dependencies
vi.mock("events")

describe("状态管理服务测试", () => {
  let stateService: StateManagementService
  let mockEventEmitter: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock EventEmitter
    mockEventEmitter = {
      on: vi.fn(),
      emit: vi.fn(),
      off: vi.fn(),
      once: vi.fn()
    }

    // Set up mocks
    const EventEmitter = require("events")
    EventEmitter.EventEmitter = vi.fn(() => mockEventEmitter)

    stateService = new StateManagementService()
  })

  describe("工作流状态管理测试", () => {
    it("应该能够创建工作流实例", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"

      const result = await stateService.createWorkflowInstance(workflowId, initialState)

      expect(result).toEqual({
        workflowId: workflowId,
        currentState: initialState,
        previousState: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith("workflowCreated", expect.any(Object))
    })

    it("应该能够获取工作流状态", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"

      // Create workflow first
      await stateService.createWorkflowInstance(workflowId, initialState)

      const result = await stateService.getWorkflowState(workflowId)

      expect(result).toEqual({
        workflowId: workflowId,
        currentState: initialState,
        previousState: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
    })

    it("应该处理获取不存在的工作流状态", async () => {
      const workflowId = "wf_nonexistent"

      await expect(stateService.getWorkflowState(workflowId))
        .rejects.toThrow("工作流实例不存在")
    })
  })

  describe("状态转换测试", () => {
    it("应该能够转换工作流状态", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"
      const newState = "requirements_generation"

      // Create workflow first
      await stateService.createWorkflowInstance(workflowId, initialState)

      const result = await stateService.transitionToState(workflowId, newState)

      expect(result).toEqual({
        workflowId: workflowId,
        currentState: newState,
        previousState: initialState,
        transitionedAt: expect.any(String)
      })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith("stateTransition", expect.any(Object))
    })

    it("应该验证状态转换的合法性", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"
      const invalidState = "invalid_state"

      // Create workflow first
      await stateService.createWorkflowInstance(workflowId, initialState)

      await expect(stateService.transitionToState(workflowId, invalidState))
        .rejects.toThrow("无效的状态转换")
    })

    it("应该处理状态转换失败的情况", async () => {
      const workflowId = "wf_nonexistent"
      const newState = "requirements_generation"

      await expect(stateService.transitionToState(workflowId, newState))
        .rejects.toThrow("工作流实例不存在")
    })
  })

  describe("状态历史记录测试", () => {
    it("应该能够记录状态转换历史", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"
      const newState = "requirements_generation"

      // Create workflow first
      await stateService.createWorkflowInstance(workflowId, initialState)

      // Transition to new state
      await stateService.transitionToState(workflowId, newState)

      const history = await stateService.getStateHistory(workflowId)

      expect(history).toHaveLength(2)
      expect(history[0].state).toBe(initialState)
      expect(history[1].state).toBe(newState)
    })

    it("应该能够获取特定时间范围的状态历史", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"
      const newState = "requirements_generation"

      // Create workflow first
      await stateService.createWorkflowInstance(workflowId, initialState)

      // Transition to new state
      await stateService.transitionToState(workflowId, newState)

      const startTime = new Date(Date.now() - 60000) // 1分钟前
      const endTime = new Date()

      const history = await stateService.getStateHistory(workflowId, startTime, endTime)

      expect(history).toHaveLength(2)
      expect(history[0].timestamp).toBeGreaterThanOrEqual(startTime.getTime())
      expect(history[1].timestamp).toBeLessThanOrEqual(endTime.getTime())
    })
  })

  describe("状态事件监听测试", () => {
    it("应该能够监听状态转换事件", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"
      const newState = "requirements_generation"
      const mockListener = vi.fn()

      // Create workflow first
      await stateService.createWorkflowInstance(workflowId, initialState)

      // Add event listener
      stateService.onStateTransition(workflowId, mockListener)

      // Transition to new state
      await stateService.transitionToState(workflowId, newState)

      expect(mockListener).toHaveBeenCalledWith(expect.objectContaining({
        workflowId: workflowId,
        fromState: initialState,
        toState: newState
      }))
    })

    it("应该能够移除状态转换事件监听器", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"
      const newState = "requirements_generation"
      const mockListener = vi.fn()

      // Create workflow first
      await stateService.createWorkflowInstance(workflowId, initialState)

      // Add and remove event listener
      stateService.onStateTransition(workflowId, mockListener)
      stateService.offStateTransition(workflowId, mockListener)

      // Transition to new state
      await stateService.transitionToState(workflowId, newState)

      expect(mockListener).not.toHaveBeenCalled()
    })
  })

  describe("工作流实例管理测试", () => {
    it("应该能够获取所有工作流实例", async () => {
      const workflowId1 = "wf_123456"
      const workflowId2 = "wf_789012"
      const initialState = "requirements_input"

      // Create workflows
      await stateService.createWorkflowInstance(workflowId1, initialState)
      await stateService.createWorkflowInstance(workflowId2, initialState)

      const instances = await stateService.getAllWorkflowInstances()

      expect(instances).toHaveLength(2)
      expect(instances[0].workflowId).toBe(workflowId1)
      expect(instances[1].workflowId).toBe(workflowId2)
    })

    it("应该能够按状态过滤工作流实例", async () => {
      const workflowId1 = "wf_123456"
      const workflowId2 = "wf_789012"
      const initialState = "requirements_input"
      const newState = "requirements_generation"

      // Create workflows
      await stateService.createWorkflowInstance(workflowId1, initialState)
      await stateService.createWorkflowInstance(workflowId2, initialState)

      // Transition one workflow to new state
      await stateService.transitionToState(workflowId1, newState)

      const instances = await stateService.getWorkflowInstancesByState(newState)

      expect(instances).toHaveLength(1)
      expect(instances[0].workflowId).toBe(workflowId1)
      expect(instances[0].currentState).toBe(newState)
    })

    it("应该能够删除工作流实例", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"

      // Create workflow first
      await stateService.createWorkflowInstance(workflowId, initialState)

      // Delete workflow
      const result = await stateService.deleteWorkflowInstance(workflowId)

      expect(result).toEqual({
        workflowId: workflowId,
        deletedAt: expect.any(String)
      })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith("workflowDeleted", expect.any(Object))

      // Verify workflow is deleted
      await expect(stateService.getWorkflowState(workflowId))
        .rejects.toThrow("工作流实例不存在")
    })
  })

  describe("状态持久化测试", () => {
    it("应该能够持久化工作流状态", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"

      // Create workflow first
      await stateService.createWorkflowInstance(workflowId, initialState)

      // Persist state
      const result = await stateService.persistWorkflowState(workflowId)

      expect(result).toEqual({
        workflowId: workflowId,
        persistedAt: expect.any(String)
      })
    })

    it("应该能够恢复持久化的工作流状态", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"

      // Create and persist workflow
      await stateService.createWorkflowInstance(workflowId, initialState)
      await stateService.persistWorkflowState(workflowId)

      // Restore state
      const result = await stateService.restoreWorkflowState(workflowId)

      expect(result).toEqual({
        workflowId: workflowId,
        currentState: initialState,
        restoredAt: expect.any(String)
      })
    })

    it("应该处理恢复不存在的工作流状态", async () => {
      const workflowId = "wf_nonexistent"

      await expect(stateService.restoreWorkflowState(workflowId))
        .rejects.toThrow("无法恢复工作流状态：持久化数据不存在")
    })
  })

  describe("状态统计测试", () => {
    it("应该能够获取状态统计信息", async () => {
      const workflowId1 = "wf_123456"
      const workflowId2 = "wf_789012"
      const initialState = "requirements_input"
      const newState = "requirements_generation"

      // Create workflows
      await stateService.createWorkflowInstance(workflowId1, initialState)
      await stateService.createWorkflowInstance(workflowId2, initialState)

      // Transition one workflow to new state
      await stateService.transitionToState(workflowId1, newState)

      const stats = await stateService.getStateStatistics()

      expect(stats).toEqual({
        totalWorkflows: 2,
        stateDistribution: {
          requirements_input: 1,
          requirements_generation: 1
        },
        averageTransitions: 1,
        calculatedAt: expect.any(String)
      })
    })

    it("应该能够获取特定工作流的状态统计", async () => {
      const workflowId = "wf_123456"
      const initialState = "requirements_input"
      const newState = "requirements_generation"

      // Create workflow
      await stateService.createWorkflowInstance(workflowId, initialState)

      // Transition to new state
      await stateService.transitionToState(workflowId, newState)

      const stats = await stateService.getWorkflowStateStatistics(workflowId)

      expect(stats).toEqual({
        workflowId: workflowId,
        totalTransitions: 1,
        timeInCurrentState: expect.any(Number),
        averageTransitionTime: expect.any(Number),
        calculatedAt: expect.any(String)
      })
    })
  })

  describe("状态清理测试", () => {
    it("应该能够清理过期的工作流状态", async () => {
      const workflowId1 = "wf_123456"
      const workflowId2 = "wf_789012"
      const initialState = "requirements_input"

      // Create workflows
      await stateService.createWorkflowInstance(workflowId1, initialState)
      await stateService.createWorkflowInstance(workflowId2, initialState)

      // Clean up expired states
      const result = await stateService.cleanupExpiredStates(24 * 60 * 60 * 1000) // 24小时

      expect(result).toEqual({
        cleanedCount: 0,
        message: "没有找到过期的工作流状态"
      })
    })

    it("应该能够强制清理所有工作流状态", async () => {
      const workflowId1 = "wf_123456"
      const workflowId2 = "wf_789012"
      const initialState = "requirements_input"

      // Create workflows
      await stateService.createWorkflowInstance(workflowId1, initialState)
      await stateService.createWorkflowInstance(workflowId2, initialState)

      // Force clean up all states
      const result = await stateService.cleanupAllStates()

      expect(result).toEqual({
        cleanedCount: 2,
        message: "清理了2个工作流状态"
      })

      // Verify workflows are deleted
      await expect(stateService.getWorkflowState(workflowId1))
        .rejects.toThrow("工作流实例不存在")
      await expect(stateService.getWorkflowState(workflowId2))
        .rejects.toThrow("工作流实例不存在")
    })
  })
})