export interface Event {
  type: string;
}

// ================

export abstract class State {
  enter(): Promise<void> {
    return Promise.resolve();
  }

  handle(e: Event): Promise<State> {
    return Promise.resolve(this);
  }

  leave(): Promise<void> {
    return Promise.resolve();
  }
}

// ================

export class StateMachine {
  _currentState: State;

  async dispatch(e: Event): Promise<State> {
    console.debug(
      "dispatch",
      "currentState",
      this._currentState && this._currentState.constructor.name
    );
    const nextState =
      this._currentState && (await this._currentState.handle(e));
    console.debug(
      "dispatch",
      "nextState",
      nextState && nextState.constructor.name
    );
    await this.transition(nextState);
    console.debug(
      "dispatch",
      "currentState",
      this._currentState && this._currentState.constructor.name
    );
    return this._currentState;
  }

  async transition(nextState: State) {
    if (this._currentState != nextState) {
      console.debug(
        "transition",
        "currentState",
        this._currentState && this._currentState.constructor.name,
        "leave"
      );
      this._currentState && (await this._currentState.leave());
      console.debug(
        "transition",
        "nextState",
        nextState && nextState.constructor.name,
        "enter"
      );
      nextState && (await nextState.enter());
      this._currentState = nextState;
    }
  }
}
