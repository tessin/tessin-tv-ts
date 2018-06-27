// this is largely based on the QP-nano framework

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

export type State<T extends StateMachine<T>> = (
  hsm: T,
  e: Event
) => Promise<State<T>>;

// ================

export class StateMachine<T extends StateMachine<T>> {
  // todo: inbox?
  currentState: State<T>;
}

// ================

export async function dispatch<T extends StateMachine<T>>(hsm: T, e: Event) {
  // todo: RTC?
  let state = hsm.currentState;
  for (; state; ) {
    state = await state(hsm, e);
  }
}

export async function transition<T extends StateMachine<T>>(
  hsm: T,
  nextState: State<T>
) {
  if (this.currentState !== nextState) {
    if (this.currentState) {
      await dispatch(hsm, new LeaveEvent());
    }
    this.currentState = nextState;
    if (this.currentState) {
      await dispatch(hsm, new EnterEvent());
    }
  }
}
