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
  if (tagsSelected.length == 0) {
    // remove all the files
    while (document.getElementById('tagged-files').childElementCount > 0)
      document.getElementById('tagged-files').firstChild.remove();
    return;
  }

  const fetchURL = `/tags/${tags}`;
  const res = await fetch(fetchURL);
  const data = await res.json();

  showTaggedImages(data);
}

function showTaggedImages(fileData) {
  const template = `
    {{#each fileData.files}}
    <div class="col-sm-6 col-md-4 files-div mt-5">

    <img id="{{this.id}}" src="{{this.url}}" alt="" class="img-thumbnail">

    <div class="mt-2">
    {{#each this.fileTags}}
      <div class="tag">#{{this}} </div>
    {{/each}}
    </div>
    
    </div>
    {{/each}}
  `;
  var compiledTemplate = Handlebars.compile(template);
  var generatedHTML = compiledTemplate({ fileData });
  document.getElementById('tagged-files').innerHTML = generatedHTML;

  addEventToImages();
}

function addEventToImages() {
  const files = document.querySelectorAll('.files-div img');
  for (let i of files) i.addEventListener('click', showModal);
}

function showModal() {
  const src = this.src;
  document.getElementById('modal-file').src = src;
  document.getElementById('modal-file-download-link').href = src;
  document.getElementById('delete-confirmation-fileId').value = this.id;
  document.getElementById('edit-fileId').value = this.id;

  const tagElements = document
    .getElementById(this.id)
    .parentElement.querySelectorAll('.tag');

  let editValue = '';
  for (let i = 0; i < tagElements.length; i++) {
    editValue += tagElements[i].innerHTML;
  }

  document.getElementById('edit-tags-input').value = editValue;

  // show modal
  document.getElementById('overlay').classList.remove('hide');
  document.getElementById('main-ui').classList.add('blurred');
}

// closing modal on clicking outside of modal
document.getElementById('overlay').addEventListener('click', (e) => {
  if (e.target.id == 'overlay' || e.target.id == 'modal-close-link') {
    closeOverlay();
  }
});

document.getElementById('modal-close-link').addEventListener('click', (e) => {
  e.preventDefault();
});

function closeOverlay() {
  document.getElementById('overlay').classList.add('hide');
  document.getElementById('main-ui').classList.remove('blurred');
}
