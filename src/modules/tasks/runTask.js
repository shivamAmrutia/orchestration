function runTask(task) {
  return new Promise((resolve, reject) => {
    console.log(`▶️ Running ${task}`);
    setTimeout(() => {
      if (Math.random() < 0.7) {
        reject(new Error(`${task} failed`));
      } else {
        resolve();
      }
    }, 1000);
  });
}

export default runTask;