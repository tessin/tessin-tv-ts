class TickEvent {
  // ...
}

class Machine {
  _states: State[];

  constructor(states: State[]) {
    // ...
    this._states = states;
  }

  init() {
    // ...
  }
}

abstract class State {
  enter(): void {
    // ...
  }

  handleTick(e: TickEvent): void {
    // ...
  }

  leave(): void {
    // ...
  }
}
