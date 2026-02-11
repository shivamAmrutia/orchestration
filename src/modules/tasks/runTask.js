function runTask(task) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.4) {
        reject(new Error(`${task.name} failed`));
      } else {
        resolve();
      }
    }, 1000);
  });
}

export default runTask;