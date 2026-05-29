document.getElementById('downloadBtn').addEventListener('click', () => {
  const blob = new Blob([document.getElementById('standupJson').value], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'daily_standup.json';
  a.click();
});
