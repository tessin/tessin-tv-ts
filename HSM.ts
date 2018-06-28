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
  _inbox: Event[] = [];
  _currentState: State<T>;

  constructor(initialState: State<T>) {
    this._currentState = initialState;
  }
}

// ================

export async function transition<T extends StateMachine<T>>(
  hsm: T,
  nextState: State<T>
) {
  if (hsm._currentState !== nextState) {
    console.debug(
      "transition",
      hsm._currentState && hsm._currentState.name,
      "=>",
      nextState && nextState.name
    );
    if (hsm._currentState) {
      await dispatch(hsm, new LeaveEvent());
    }
    hsm._currentState = nextState;
    if (hsm._currentState) {
      await dispatch(hsm, new EnterEvent());
    }
  }
}

export async function dispatch<T extends StateMachine<T>>(hsm: T, e: Event) {
  let state = hsm._currentState;
  for (; state; ) {
    console.debug("dispatch", e.constructor.name, "=>", state.name);
    state = await state(hsm, e);
  }
}

export function post<T extends StateMachine<T>>(hsm: T, e: Event) {
  hsm._inbox.push(e);
}

export async function runToCompletion<T extends StateMachine<T>>(hsm: T) {
  for (; 0 < hsm._inbox.length; ) {
    await dispatch(hsm, hsm._inbox.shift());
  }
}
