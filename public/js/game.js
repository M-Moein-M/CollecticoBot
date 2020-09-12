window.addEventListener('DOMContentLoaded', (event) => {
  const audio = document.getElementById('player');
  const palyBtn = document.getElementById('play-btn');
  const wordInput = document.getElementById('word');
  wordInput.focus();
  palyBtn.addEventListener('click', () => {
    audio.currentTime = 0;
    audio.play();
    wordInput.focus();
  });
});
