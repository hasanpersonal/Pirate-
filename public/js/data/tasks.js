// Task definitions. Add a new task by appending one entry here.
export const TASKS = [
  { id: 'kill3',  name: 'Sink 3 enemy ships',   target: 3,  reward: { gold: 100, diamonds: 1 }, progressKey: 'kills' },
  { id: 'kill10', name: 'Sink 10 enemy ships',  target: 10, reward: { gold: 400, diamonds: 3 }, progressKey: 'kills' },
  { id: 'win1',   name: 'Win 1 battle',         target: 1,  reward: { gold: 200, diamonds: 2, petroleum: 20 }, progressKey: 'wins' },
  { id: 'play3',  name: 'Play 3 battles',       target: 3,  reward: { gold: 150, diamonds: 1 }, progressKey: 'battles' },
];
