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
  inbox: Event[] = [];
  currentState: State<T>;
}

// ================

export async function transition<T extends StateMachine<T>>(
  hsm: T,
  nextState: State<T>
) {
  if (hsm.currentState !== nextState) {
    console.debug(
      "transition",
      hsm.currentState && hsm.currentState.name,
      "=>",
      nextState && nextState.name
    );
    if (hsm.currentState) {
      await dispatch(hsm, new LeaveEvent());
    }
    hsm.currentState = nextState;
    if (hsm.currentState) {
      await dispatch(hsm, new EnterEvent());
    }
  }
}

export async function dispatch<T extends StateMachine<T>>(hsm: T, e: Event) {
  // todo: RTC?
  let state = hsm.currentState;
  for (; state; ) {
    console.debug("dispatch", e.constructor.name, "=>", state.name);
    state = await state(hsm, e);
  }
}

export function post<T extends StateMachine<T>>(hsm: T, e: Event) {
  hsm.inbox.push(e);
}

export async function runToCompletion<T extends StateMachine<T>>(
  hsm: T,
  e: Event
) {
  let i;
  try {
    for (i = 0; 0 < hsm.inbox.length; i++) {
      await dispatch(hsm, e);
    }
  } finally {
    hsm.inbox = hsm.inbox.slice(i); // dispatched events that fail are not retried later
  }
}
