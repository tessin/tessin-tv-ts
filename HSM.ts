export interface Event {
  type: string;
}

export class EnterEvent {
  type: string = "@@enter";
}

export class LeaveEvent {
  type: string = "@@leave";
}

// ================

export type State<T> = (
  m: StateMachine<T>,
  e: Event,
  context: T
) => Promise<State<T>>;

// ================

export class StateMachine<T> {
  context: T;
  currentState: State<T>;

  constructor(context: T) {
    this.context = context;
  }

  async dispatch(e: Event) {
    let s = this.currentState;
    for (; s; ) {
      s = await s(this, e, this.context);
    }
  }

  async transition(nextState: State<T>) {
    if (this.currentState !== nextState) {
      if (this.currentState) {
        await this.dispatch(new LeaveEvent());
      }
      this.currentState = nextState;
      if (this.currentState) {
        await this.dispatch(new EnterEvent());
      }
    }
  }
}
