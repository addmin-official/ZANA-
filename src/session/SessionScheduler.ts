import { ScheduledTask } from "./types.ts";

export class SessionScheduler {
  private tasks: ScheduledTask[] = [];

  constructor(initialTasks?: ScheduledTask[]) {
    if (initialTasks) {
      this.tasks = [...initialTasks];
    }
  }

  public getTasks(): ScheduledTask[] {
    return [...this.tasks];
  }

  public scheduleTask(
    type: "review" | "practice" | "revision" | "rest_reminder" | "daily_spark_trigger",
    scheduledFor: string,
    nodeId: string,
    messageKu: string
  ): ScheduledTask {
    const newTask: ScheduledTask = {
      id: `sched_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      type,
      scheduledFor,
      nodeId,
      messageKu,
      isTriggered: false
    };

    this.tasks.push(newTask);
    return newTask;
  }

  public triggerTask(taskId: string): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && !task.isTriggered) {
      task.isTriggered = true;
      return true;
    }
    return false;
  }

  public getPendingTasks(currentTime: string = new Date().toISOString()): ScheduledTask[] {
    return this.tasks.filter(task => !task.isTriggered && task.scheduledFor <= currentTime);
  }

  public getTasksByType(type: ScheduledTask["type"]): ScheduledTask[] {
    return this.tasks.filter(task => task.type === type);
  }

  public clearTriggeredTasks(): void {
    this.tasks = this.tasks.filter(task => !task.isTriggered);
  }
}
