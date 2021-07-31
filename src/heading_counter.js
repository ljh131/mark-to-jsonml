class HeadingCounter {
  constructor() {
    this.init();
  }

  init() {
    this.counter = {h1: 0, h2: 0, h3: 0};
  }

  increase(lev) {
    let num;
    if (lev == 1) {
      this.counter.h1 += 1;
      this.counter.h2 = 0;
      this.counter.h3 = 0;
      num = `${this.counter.h1}.`;
    } else if (lev == 2) {
      this.counter.h2 += 1;
      this.counter.h3 = 0;
      num = `${this.counter.h1}.${this.counter.h2}.`;
    } else if (lev == 3) {
      this.counter.h3 += 1;
      num = `${this.counter.h1}.${this.counter.h2}.${this.counter.h3}.`;
    }
    return num;
  }
}

module.exports = {HeadingCounter};
