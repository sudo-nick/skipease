/** @type {string} */
const EXTENSION_NAME = "skip-ease"
/** @type {HTMLVideoElement | undefined} */
let video = undefined;
/** @type {HTMLElement | undefined} */
let UI = undefined;

const PLUS_ICON = chrome.runtime.getURL("assets/plus.svg");
const TRASH_ICON = chrome.runtime.getURL("assets/trash.svg");
const RA_ICON = chrome.runtime.getURL("assets/right-arrow.svg");
const SKIPEASE_ICON = chrome.runtime.getURL("assets/skip-ease.png");

// schema: 
// {"vidId": [{from: 0, to: 10}, ...]}

if (!localStorage.getItem(EXTENSION_NAME)) {
	localStorage.setItem(EXTENSION_NAME, JSON.stringify({}));
}

const getData = () => {
	return JSON.parse(localStorage.getItem(EXTENSION_NAME) || {});
}

const saveData = (d) => {
	localStorage.setItem(EXTENSION_NAME, JSON.stringify(d));
}

const getSkipEntries = (videoId) => {
	const d = getData();
	return d[videoId] || [];
}

const addSkipEntry = (vidId, from, to) => {
	const d = getData();
	if (!d[vidId]) {
		d[vidId] = [{ from, to }];
		saveData(d);
		return;
	}
	d[vidId].push({ from, to });
	saveData(d);
}


const removeSkipEntry = (vidId, from, to) => {
	const d = getData();
	if (!d[vidId]) {
		return;
	}
	d[vidId] = d[vidId].filter(e => e.from !== from || e.to !== to);
	saveData(d);
}

const parseTime = (timeStr) => {
	let a = timeStr.split(":").reverse();
	let time = a.reduce((total, curr, i) => {
		return total + curr * Math.pow(60, i);
	}, 0);
	return time;
}

const stringifyTime = (time) => {
	if (time == 0) {
		return "00:00";
	}
	let s = "";
	let i = 1;
	while (time) {
		let r = time % Math.pow(60, i);
		time = time - r;
		s = String(r / Math.max(Math.pow(60, i - 1), 1)).padStart(2, "0") + (i != 1 ? ":" : "") + s;
		i++;
	}
	return s;
}

const getVideoId = () => {
	const res = window.location.href.match(/v=([a-zA-Z0-9\-]+)&?/)
	if (!res || res.length < 1) {
		return "";
	}
	return res[1];
}

const renderUI = () => {
	removeUI();
	const parentContainer = document.getElementById("below");
	if (!parentContainer) {
		setTimeout(() => {
			renderUI();
		}, 500);
		return;
	}
	const wrapper = document.createElement("div");
	wrapper.classList.add("skip-ease-container");

	const inputContainer = document.createElement("div");
	inputContainer.classList.add("skip-ease-input-container");

	const fromTimeElement = document.createElement("input");
	fromTimeElement.id = "skip-ease-from-input";
	fromTimeElement.type = "text";
	inputContainer.appendChild(fromTimeElement);

	const rightArrowIcon = document.createElement("img");
	rightArrowIcon.src = RA_ICON;
	inputContainer.appendChild(rightArrowIcon);

	const toTimeElement = document.createElement("input");
	toTimeElement.id = "skip-ease-to-input";
	toTimeElement.type = "text";
	inputContainer.appendChild(toTimeElement);

	const addButton = document.createElement("img");
	addButton.classList.add("skip-ease-add-button");
	addButton.src = PLUS_ICON;
	inputContainer.appendChild(addButton);

	wrapper.appendChild(inputContainer);

	addButton.onclick = () => {
		const videoId = getVideoId();
		let from = parseInt(parseTime(fromTimeElement.value));
		let to = parseInt(parseTime(toTimeElement.value));
		if (from < 0 || from > video.duration || to < 0 || to > video.duration) {
			alert("please enter valid skip points.");
			return;
		}
		addSkipEntry(videoId, from, to);
		renderUI();
		fromTimeElement.value = "";
		toTimeElement.value = "";
	}

	let entries = getSkipEntries(getVideoId());
	entries.forEach((li) => {
		const entryContainer = document.createElement("div");
		entryContainer.classList.add("skip-ease-entry");

		const timestamps = document.createElement("span");
		timestamps.classList.add("skip-ease-entry-timestamps");
		timestamps.innerText = `${stringifyTime(li.from)} - ${stringifyTime(li.to)}`
		Object.assign(timestamps.style, {
		})

		const deleteBtn = document.createElement("div");
		deleteBtn.classList.add("skip-ease-entry-delete");
		deleteBtn.addEventListener("click", () => {
			removeSkipEntry(getVideoId(), li.from, li.to);
			renderUI();
		});

		const deleteIcon = document.createElement("img");
		deleteIcon.src = TRASH_ICON;
		deleteBtn.appendChild(deleteIcon);

		entryContainer.appendChild(timestamps);
		entryContainer.appendChild(deleteBtn);
		wrapper.appendChild(entryContainer);
	})

	UI = wrapper;
	parentContainer.prepend(wrapper);
}

const removeUI = () => {
	if (UI) {
		UI.remove();
		UI = undefined;
	}
}

const watching = () => {
	return window.location.href.indexOf("/watch") != -1;
}

const checkAndMountVideoListener = () => {
	if (!watching()) {
		setTimeout(() => {
			checkAndMountVideoListener();
		}, 1000);
		return;
	}
	video = document.querySelector("#movie_player > div.html5-video-container > video");
	if (!video) {
		setTimeout(() => {
			checkAndMountVideoListener();
		}, 200);
		return;
	}
	addVideoListener();
}

const addVideoListener = () => {
	video.addEventListener("timeupdate", (e) => {
		let currTime = e.target.currentTime;
		let vid = getVideoId();
		let skipEntries = getSkipEntries(vid);
		for (let e of skipEntries) {
			if (currTime >= e.from && (currTime <= e.to || e.to < e.from)) {
				video.currentTime = e.to + 0.001;
				break;
			}
		}
	})
}

checkAndMountVideoListener();

let prevURL = undefined;
setInterval(() => {
	if (prevURL !== window.location.href) {
		prevURL = window.location.href;
		if (UI && watching()) {
			renderUI();
			return;
		}
		removeUI();
	}
}, 1000);

// Register shortcut
window.addEventListener("keydown", (e) => {
	if (e.key === "S" && e.altKey && e.shiftKey) {
		if (UI) {
			removeUI();
		} else {
			renderUI();
		}
	}
})

const showUIButton = document.createElement("button");
showUIButton.classList.add("ytp-button")
showUIButton.classList.add("skip-ease-show-ui-button");

const icon = document.createElement("img");
icon.src = SKIPEASE_ICON;

showUIButton.appendChild(icon);
showUIButton.addEventListener("click", () => {
	if (UI) {
		removeUI();
	} else {
		renderUI();
	}
})

function mountShowUIButton() {
	const controlsContainer = document.querySelector("#movie_player > div.ytp-chrome-bottom > div.ytp-chrome-controls > div.ytp-right-controls > div.ytp-right-controls-left");
	if (controlsContainer) {
		controlsContainer.prepend(showUIButton);
		return
	}
	setTimeout(mountShowUIButton, 1000);
}

// Mount Show UI control button
mountShowUIButton();
