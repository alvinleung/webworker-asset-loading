// interesting discussion on whether webworker actually improves loading poerformance
// https://dev.to/trezy/loading-images-with-web-workers-49ap

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

  const beginBenchmarkButton = document.createElement("button");
  beginBenchmarkButton.innerHTML = "Begin benchmark";
  beginBenchmarkButton.style.marginTop = "64px";
  beginBenchmarkButton.addEventListener("click", beginBenchmark);
  document.body.appendChild(beginBenchmarkButton);
})();

async function beginBenchmark() {
  logInfo("init test...");
  setTimeout(async () => {
    logInfo("first run =============================================");
    await runTest();
    logInfo("second run =============================================");
    await runTest();
    logInfo("third run =============================================");
    await runTest();
    console.log("benchmark done");
  }, 2000);
}

async function runTest() {
  let beginTime = performance.now();
  await loadAllMainThread(getRandomImageUrls());
  logInfo(`Main thread loading took: ${performance.now() - beginTime}`);

  beginTime = performance.now();
  await loadAllWorker(getRandomImageUrls());
  logInfo(`Worker thread loading took: ${performance.now() - beginTime}`);
}

function logInfo(s: string) {
  const div = document.createElement("div");
  div.innerHTML = s;
  document.body.appendChild(div);
}
