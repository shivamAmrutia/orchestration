function runTask(taskId) {
  return new Promise((resolve, reject) => {
    console.log(`▶️ Running ${taskId}`);
    setTimeout(() => {
      if (Math.random() < 0.3) {
        reject(new Error(`${taskId} failed`));
      } else {
        resolve();
      }
    }, 1000);
  });
}

export default runTask;