document.addEventListener('DOMContentLoaded', () => {
  const tagsBtn = document.querySelectorAll('.tag-button');
  for (let btn of tagsBtn) {
    btn.addEventListener('click', () => {
      btn.blur();
      document
        .getElementById(btn.id.toString())
        .classList.toggle('tag-selected');
      loadTags();
    });
  }
});

async function loadTags() {
  let tags = '';
  const tagsSelected = document.querySelectorAll('.tag-selected');
  for (let tag of tagsSelected) {
    tags += '-' + tag.id;
  }
  if (tagsSelected.length == 0) return;

  const fetchURL = `/tags/${tags}`;
  const res = await fetch(fetchURL);
  const data = await res.json();
  console.log('==))  ', data);
}
