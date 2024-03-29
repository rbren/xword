export class Cell {
  value: string;
  autocompleted: boolean;
  filled: boolean;
  number: number;

  constructor(cell?: any) {
    if (cell) {
      this.value = cell.value;
      this.autocompleted = cell.autocompleted;
      this.filled = cell.filled;
      this.number = cell.number;
    }
  }

  toggleFill(val?: boolean) {
    this.filled = val === undefined ? !this.filled : val;
    if (this.filled) this.number = null;
  }

  validate() {
    if (!this.value) return;
    this.autocompleted = false;
    var c = this.value.length - 1;
    while (c >= 0 && !this.value.charAt(c).match(/\w/)) --c
    if (c < 0) this.value = '';
    else this.value = this.value.charAt(c);
  }
}

export class Clue {
  prompt: string;
  constraint: number;

  constructor(public number:number, public cells: Cell[]) {
  }

  isEmpty() {
    return !this.cells.filter(c => c.value ? true : false).length;
  }
  isFull() {
    return !this.cells.filter(c => !c.value).length;
  }
  isAutocompleted() {
    return this.cells.filter(c => c.autocompleted).length ? true : false;
  }
  getValue() {
    return this.cells.map(c => c.value).join('');
  }

  autocomplete(completion) {
    this.cells.forEach((c, idx) => {
      if (!c.value) c.autocompleted = true;
      c.value = completion.word.charAt(idx);
    });
  }
}

export class ClueSet {
  constructor(public down:Clue[]=[], public across:Clue[]=[]) {}

  getClues() {
    return this.across.concat(this.down);
  }
}

export class Grid {
  constructor(public cells?: Cell[][], public clues?: ClueSet) {
    if (!this.clues) this.clues = new ClueSet();
    if (!this.cells) this.cells = [[]];
    this.reset();
  }

  serialize() {
    return JSON.stringify({cells: this.cells, clues: this.clues});
  }

  static deserialize(obj) {
    if (typeof obj === 'string') obj = JSON.parse(obj);
    var cells = obj.cells.map(r => r.map(c => new Cell(c)));
    var grid = new Grid(cells);
    obj.clues.across.forEach(clue => {
      var newClue = grid.clues.across.filter(c => c.number === clue.number)[0];
      if (newClue) newClue.prompt = clue.prompt;
    })
    obj.clues.down.forEach(clue => {
      var newClue = grid.clues.down.filter(c => c.number === clue.number)[0];
      if (newClue) newClue.prompt = clue.prompt;
    })
    return grid;
  }

  changeSize(newSize) {
    while (newSize < this.cells.length) {
      this.cells.forEach(r => r.pop());
      this.cells.pop();
    }
    while (newSize > this.cells.length) {
      var newRow = [];
      for (var i = 0; i < this.cells.length; ++i) newRow.push(new Cell());
      this.cells.push(newRow);
      this.cells.forEach(r => r.push(new Cell()))
    }
    this.reset();
  }

  getCells(direction, start, length) {
    if (direction === 'across') {
      return this.cells[start[0]].filter((c, idx) => idx >= start[1] && idx < start[1] + length);
    } else {
      var cells = [];
      this.cells.forEach((row, i) => {
        if (i >= start[0] && i < start[0] + length) {
          cells.push(row[start[1]]);
        }
      })
      return cells;
    }
  }

  getCluesForCell(cell) {
    var down = this.clues.down.filter(clue => clue.cells.indexOf(cell) !== -1)[0];
    var across = this.clues.across.filter(clue => clue.cells.indexOf(cell) !== -1)[0];
    return {down, across}
  }

  getIntersectingClues(clue) {
    var dir = this.clues.down.indexOf(clue) === -1 ? 'down' : 'across';
    return clue.cells.map(cell => this.getCluesForCell(cell)[dir]).filter(clue => clue);
  }

  getMirrorCell(cell) {
    var mCell = null;
    this.cells.forEach((row, rowIdx) => {
      row.forEach((otherCell, cellIdx) => {
        if (cell === otherCell) {
          mCell = this.cells[this.cells.length - rowIdx - 1][this.cells.length - cellIdx - 1];
        }
      })
    })
    return mCell;
  }

  mirrorFilledCells() {
    this.cells.forEach((row, rowIdx) => {
      row.forEach((cell, cellIdx) => {
        var loc = [rowIdx, cellIdx];
        var mirrorLoc = [this.cells.length - loc[0] - 1, this.cells.length - loc[1] - 1];
        this.cells[mirrorLoc[0]][mirrorLoc[1]].filled = cell.filled;
      })
    })
  }

  reset() {
    this.mirrorFilledCells();
    var cur = 1;
    this.clues.down = [];
    this.clues.across = [];
    this.cells.forEach((row, i) => {
      row.forEach((cell, j) => {
        delete cell.number;
        if (cell.filled) return;
        var above = i === 0 ? true : this.cells[i-1][j].filled;
        var below = i === this.cells.length - 1 ? true : this.cells[i+1][j].filled;
        var left  = j === 0 ? true : this.cells[i][j-1].filled;
        var right = j === this.cells[0].length - 1 ? true : this.cells[i][j+1].filled;
        if ((above && !below) || (left && !right)) {
          if (above && !below) {
            var length = 0;
            while (i + length < this.cells.length && !this.cells[i + length][j].filled) ++length;
            var clue = new Clue(cur, this.getCells('down', [i,j], length));
            this.clues.down.push(clue);
          }
          if (left && !right) {
            var length = 0;
            while (j + length < this.cells[0].length && !this.cells[i][j+length].filled) ++length;
            var clue = new Clue(cur, this.getCells('across', [i,j], length));
            this.clues.across.push(clue);
          }
          cell.number = cur++;
        }
      })
    })
  }

  resetText() {
    this.cells.forEach(row => {
      row.forEach(cell => {
        cell.autocompleted = false;
        cell.value = '';
      })
    })
    this.clues.getClues().forEach(c => c.prompt = '');
  }
}


