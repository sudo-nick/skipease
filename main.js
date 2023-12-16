const EXTENSION_NAME = "skip-ease"
let video = undefined;
let UI = undefined;

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
	d[vidId] = d[vidId].filter(e => e.from !== from && e.to !== to);
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
	Object.assign(wrapper.style, {
		"display": "flex",
		"flexWrap": "wrap",
		"gap": "10px",
		"align-items": "center",
	})

	const container = document.createElement("div");
	wrapper.appendChild(container);
	container.id = EXTENSION_NAME + "_ui";
	Object.assign(container.style, {
		"display": "flex",
		"gap": "5px",
		"width": "fit-content",
		"padding": "5px",
		"margin": "10px 0px",
		"border": "1px solid white",
		"borderRadius": "5px",
	})
	const inputStyle = {
		"width": "45px",
		"fontSize": "12px",
		"padding": "2px 5px",
		"border": "1px solid white",
		"background": "transparent",
		"color": "white",
		"outline": "none",
		"borderRadius": "5px",
	}
	const fromTimeElement = document.createElement("input");
	fromTimeElement.type = "text";
	Object.assign(fromTimeElement.style, inputStyle);
	container.appendChild(fromTimeElement);

	const toTimeElement = document.createElement("input");
	toTimeElement.type = "text";
	Object.assign(toTimeElement.style, inputStyle);
	container.appendChild(toTimeElement);

	const addButton = document.createElement("button");
	addButton.innerText = "Add";
	Object.assign(addButton.style, {
		"display": "flex",
		"fontSize": "12px",
		"align-items": "center",
		"justify-content": "center",
		"color": "white",
		"font-weight": "bold",
		"background": "transparent",
		"border": "1px solid white",
		"borderRadius": "5px",
		"cursor": "pointer",
	})
	container.appendChild(addButton);

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
		const e = document.createElement("span");
		e.innerText = `${stringifyTime(li.from)} - ${stringifyTime(li.to)}`
		Object.assign(e.style, {
			"display": "flex",
			"fontSize": "12px",
			"align-items": "center",
			"width": "max-content",
			"padding": "5px",
			"color": "white",
			"gap": "5px",
			"align-items": "center",
			"background": "transparent",
			"border": "1px solid white",
			"borderRadius": "5px",
		})
		const x = document.createElement("span");
		x.innerText = "x";
		x.onclick = () => {
			removeSkipEntry(getVideoId(), li.from, li.to);
			renderUI();
		}
		Object.assign(x.style, {
			"display": "flex",
			"width": "20px",
			"height": "20px",
			"cursor": "pointer",
			"align-items": "center",
			"justify-content": "center",
			"font-weight": "bold",
			"background": "red",
			"color": "white",
			"borderRadius": "5px",
		})
		e.appendChild(x);
		wrapper.appendChild(e);
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

const initVideoPlayer = () => {
	if (!watching()) {
		setTimeout(() => {
			initVideoPlayer();
		}, 1000);
		return;
	}
	video = document.querySelector("#movie_player > div.html5-video-container > video");
	if (!video) {
		initVideoPlayer();
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
			if (currTime >= e.from && currTime <= e.to) {
				video.currentTime = e.to;
				break;
			}
		}
	})
}

initVideoPlayer();

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

window.addEventListener("keydown", (e) => {
	if (e.key === "S" && e.altKey && e.shiftKey) {
		if (UI) {
			removeUI();
		} else {
			renderUI();
		}
	}
})
