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
    // remove all the images
    while (document.getElementById('tagged-images').childElementCount > 0)
      document.getElementById('tagged-images').firstChild.remove();
    return;
  }

  const fetchURL = `/tags/${tags}`;
  const res = await fetch(fetchURL);
  const data = await res.json();
  console.log(data);
  showTaggedImages(data);
}

function showTaggedImages(imgData) {
  const template = `
    {{#each imgData.images}}
    <div class="col-sm-6 col-md-4 images-div mt-5">

    <img src="{{this.url}}" alt="" class="img-thumbnail">

    <div class="mt-2">
    {{#each this.imageTags}}
      <div class="tag">#{{this}} </div>
    {{/each}}
    </div>
    
    </div>
    {{/each}}
  `;
  var compiledTemplate = Handlebars.compile(template);
  var generatedHTML = compiledTemplate({ imgData });
  document.getElementById('tagged-images').innerHTML = generatedHTML;
}
