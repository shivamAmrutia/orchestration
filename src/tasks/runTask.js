function runTask(taskId) {
    return new Promise((resolve) => {
      console.log(`▶️ Running ${taskId}`);
      setTimeout(() => {
        console.log(`✅ Finished ${taskId}`);
        resolve();
      }, 1000);
    });
  }

export default runTask;