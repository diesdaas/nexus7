import { Task, Job, createLogger, NexusError, ErrorCode } from '@nexus/shared';
import { AgentRegistry } from '@nexus/agent-registry';

const logger = createLogger('TaskOrchestrator');

/**
 * Task Orchestrator - Manages task decomposition, assignment, and coordination
 */
export class TaskOrchestrator {
  private tasks: Map<string, Task> = new Map();
  private jobs: Map<string, Job> = new Map();
  private agentRegistry: AgentRegistry;

  constructor(agentRegistry: AgentRegistry) {
    this.agentRegistry = agentRegistry;
  }

  /**
   * Create a new job from user objective
   */
  public createJob(userId: string, title: string, objective: string): Job {
    const jobId = this.generateId('job');
    const job: Job = {
      id: jobId,
      userId,
      title,
      objective,
      status: 'pending',
      tasks: [],
      createdAt: new Date(),
      metrics: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageTaskDuration: 0,
      },
    };
    this.jobs.set(jobId, job);
    logger.info(`Job created: ${jobId}`, { userId, title });
    return job;
  }

  /**
   * Decompose a job into tasks
   */
  public decomposeTasks(jobId: string, taskDefinitions: Partial<Task>[]): Task[] {
    const job = this.getJob(jobId);

    const tasks = taskDefinitions.map((def) => {
      const task: Task = {
        id: this.generateId('task'),
        parentId: jobId,
        name: def.name || 'Unnamed Task',
        description: def.description || '',
        objective: def.objective || '',
        status: 'pending',
        priority: def.priority || 0,
        dependencies: def.dependencies || [],
        createdAt: new Date(),
        metadata: def.metadata || {},
      };
      this.tasks.set(task.id, task);
      job.tasks.push(task);
      logger.debug(`Task created: ${task.id}`, { jobId });
      return task;
    });

    job.metrics.totalTasks = job.tasks.length;
    logger.info(`Tasks decomposed for job: ${jobId}`, { count: tasks.length });
    return tasks;
  }

  /**
   * Assign task to agent
   */
  public assignTask(taskId: string, agentId: string): void {
    const task = this.getTask(taskId);
    const agent = this.agentRegistry.getAgent(agentId);

    task.assignedAgentId = agentId;
    task.status = 'queued';
    logger.info(`Task assigned to agent`, { taskId, agentId, agentType: agent.type });
  }

  /**
   * Mark task as completed
   */
  public completeTask(taskId: string, result: unknown): void {
    const task = this.getTask(taskId);
    task.status = 'completed';
    task.completedAt = new Date();
    task.result = result;

    if (task.parentId) {
      const job = this.getJob(task.parentId);
      job.metrics.completedTasks++;
      this.updateJobMetrics(job);
    }

    logger.info(`Task completed: ${taskId}`);
  }

  /**
   * Mark task as failed
   */
  public failTask(taskId: string, error: string): void {
    const task = this.getTask(taskId);
    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date();

    if (task.parentId) {
      const job = this.getJob(task.parentId);
      job.metrics.failedTasks++;
      this.updateJobMetrics(job);
    }

    logger.error(`Task failed: ${taskId}`, { error });
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): Task {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new NexusError(ErrorCode.INVALID_TASK, `Task not found: ${taskId}`);
    }
    return task;
  }

  /**
   * Get job by ID
   */
  public getJob(jobId: string): Job {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NexusError(ErrorCode.INVALID_TASK, `Job not found: ${jobId}`);
    }
    return job;
  }

  /**
   * Get all tasks for a job
   */
  public getJobTasks(jobId: string): Task[] {
    const job = this.getJob(jobId);
    return job.tasks;
  }

  /**
   * Update job metrics
   */
  private updateJobMetrics(job: Job): void {
    const completedTasks = job.tasks.filter((t) => t.status === 'completed').length;
    const failedTasks = job.tasks.filter((t) => t.status === 'failed').length;

    const completedWithDuration = job.tasks.filter(
      (t) => t.status === 'completed' && t.startedAt && t.completedAt
    );

    job.metrics.completedTasks = completedTasks;
    job.metrics.failedTasks = failedTasks;

    if (completedWithDuration.length > 0) {
      const totalDuration = completedWithDuration.reduce((sum, t) => {
        if (t.startedAt && t.completedAt) {
          return sum + (t.completedAt.getTime() - t.startedAt.getTime());
        }
        return sum;
      }, 0);
      job.metrics.averageTaskDuration = totalDuration / completedWithDuration.length;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get orchestrator stats
   */
  public getStats(): Record<string, unknown> {
    return {
      totalTasks: this.tasks.size,
      totalJobs: this.jobs.size,
      tasks: {
        pending: Array.from(this.tasks.values()).filter((t) => t.status === 'pending').length,
        queued: Array.from(this.tasks.values()).filter((t) => t.status === 'queued').length,
        inProgress: Array.from(this.tasks.values()).filter((t) => t.status === 'in_progress')
          .length,
        completed: Array.from(this.tasks.values()).filter((t) => t.status === 'completed').length,
        failed: Array.from(this.tasks.values()).filter((t) => t.status === 'failed').length,
      },
    };
  }
}
