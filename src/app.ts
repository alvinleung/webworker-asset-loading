function createWorker(fn: (event: MessageEvent) => void) {
  var blob = new Blob(["self.onmessage = ", fn.toString()], {
    type: "text/javascript",
  });
  var url = URL.createObjectURL(blob);

  return new Worker(url);
}

const NUMBER_OF_IMAGES = 100;
function getRandomImageUrls() {
  const urls: string[] = [];
  for (let i = 0; i < NUMBER_OF_IMAGES; i++) {
    urls.push(
      `https://picsum.photos/1920/1080?random=${
        i * Math.random() + Math.random()
      }`
    );
  }
  return urls;
}

function loadAllMainThread(urls: string[]) {
  return new Promise((resolve, reject) => {
    let loaded = 0;
    const loadedImageList: HTMLImageElement[] = [];
    urls.forEach((url, index) => {
      // load
      const image = new Image();
      image.onload = () => {
        loaded++;
        loadedImageList.push(image);
        if (loaded === 100) {
          resolve(loadedImageList);
        }
      };
      image.src = url;
    });
  });
}

function loadAllWorker(urls: string[]) {
  const imageLoadingWorker = createWorker((event: MessageEvent) => {
    let workerSelf = self;
    let urls = event.data.urls;

    urls.forEach(async (url: string, index: number) => {
      // load
      const response = await fetch(url);
      const fileBlob = await response.blob();
      workerSelf.postMessage(fileBlob);
    });
  });
  return new Promise((resolve, reject) => {
    // code
    let loaded = 0;
    // let loadedBlobs: Blob[] = [];
    let allImages: HTMLImageElement[] = [];
    imageLoadingWorker.postMessage({ urls });
    imageLoadingWorker.onmessage = (event: MessageEvent) => {
      // let img = new Image();
      // img.src = URL.createObjectURL(event.data);
      // allImages.push(img);
      loaded++;

      if (loaded === 100) {
        resolve(allImages);
      }
    };
  });
}

(async () => {
  console.log("init test...");
  const spinningBox = document.createElement("div");
  spinningBox.style.width = "100px";
  spinningBox.style.height = "100px";
  spinningBox.style.backgroundColor = "red";

  document.body.appendChild(spinningBox);
  let rot = 0;
  setInterval(() => {
    spinningBox.style.transform = `rotate(${rot}deg)`;
    rot++;
  }, 16);

  setTimeout(async () => {
    console.log("first run =============================================");
    await runTest();
    console.log("second run =============================================");
    await runTest();
    console.log("third run =============================================");
    await runTest();
    console.log("benchmark done");
  }, 2000);
})();

async function runTest() {
  console.time("Main thread loading");
  await loadAllMainThread(getRandomImageUrls());
  console.timeEnd("Main thread loading");

  console.time("Worker loading");
  await loadAllWorker(getRandomImageUrls());
  console.timeEnd("Worker loading");
}
