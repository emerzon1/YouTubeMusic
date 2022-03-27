const playlistLink = "https://open.spotify.com/playlist/37i9dQZF1DX0s5kDXi1oC5"; // FILL THIS OUT
const playlistName = "Top 50"; // FILL THIS OUT
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const youtubeMp3Converter = require("youtube-mp3-converter");
const app = express();
const fs = require("fs");
const request = require("request");
const KEY = process.env.GOOGLE_YOUTUBE_API_KEY;
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const axios = require("axios");
app.use(cors());
app.listen(4000, () => {
	console.log("Server Works at port 4000");
});
app.get("/download", async (req, res) => {
	var URL = req.query.URL;
	console.log(URL);
	res.header("Content-Disposition", 'attachment; filename="video.mp4"');
	const convertLinkToMp3 = youtubeMp3Converter("~/Downloads/music");
	const pathToMp3 = await convertLinkToMp3(
		"https://www.youtube.com/watch?v=_cyND_1y1k0"
	);
	console.log(pathToMp3);
});

console.log(playlistLink.substring(playlistLink.indexOf("playlist/") + 9));
let songs = [];
let ind = 0;
const spotifyQuery = async (token) => {
	const link = `https://api.spotify.com/v1/playlists/${playlistLink.substring(
		playlistLink.indexOf("playlist/") + 9
	)}/tracks?fields=items(track(name%2C%20artists(name)))`;
	const response = await axios.get(link, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	for (let i of response.data.items) {
		let newSong = i.track.name + " - ";
		for (let artist of i.track.artists) {
			newSong += artist.name + ", ";
		}
		songs.push(newSong.substring(0, newSong.length - 2));
	}
	try {
		fs.mkdirSync(playlistName);
	} catch (e) {
		console.log("Folder with that name");
	}
	return playlistName;
};

const links = [];
const findLinks = async () => {
	for (let i of songs) {
		const response = await axios.get(
			"https://www.googleapis.com/youtube/v3/search",
			{
				params: {
					q: i,
					part: "snippet",
					maxResults: 1,
					type: "video",
					key: KEY,
				},
			}
		);
		let link =
			"https://www.youtube.com/watch?v=" +
			response.data.items[0].id.videoId;
		links.push(link);
	}
};
const runFunc = async (folderLocation) => {
	for (let i = 0; i < links.length; i++) {
		try {
			const convertLinkToMp3 = youtubeMp3Converter(
				`${__dirname}/${folderLocation}`
			);
			const res = await convertLinkToMp3(links[i], {
				title: songs[i],
			});
			console.log(res);
		} catch (e) {
			console.log(e);
			console.log("Error, trying again");
			i--;
		}
	}
};

var client_id = process.env.SPOTIFY_CLIENT_ID;
var client_secret = process.env.SPOTIFY_CLIENT_SECRET

var authOptions = {
	url: "https://accounts.spotify.com/api/token",
	headers: {
		Authorization:
			"Basic " +
			new Buffer(client_id + ":" + client_secret).toString("base64"),
	},
	form: {
		grant_type: "client_credentials",
	},
	json: true,
};

request.post(authOptions, async function (error, response, body) {
	if (!error && response.statusCode === 200) {
		var token = body.access_token;
		const folderLocation = await spotifyQuery(token);
		console.log(songs);

		await findLinks();
		console.log(links);
		await runFunc(folderLocation);
		
	}
});
