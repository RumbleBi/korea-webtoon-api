const path = require("path");
const { Worker } = require("worker_threads");
const express = require("express");
var cors = require("cors");

//호스팅 서버 슬립 방지
const http = require("http");
setInterval(function () {
  http.get("http://korean-webtoon-hub-project.herokuapp.com");
}, sec(600));

var naver_info = [];
var naver_weekday_info = [];
var daum_info = [];
var weekday_num = {
  0: "mon",
  1: "tue",
  2: "wed",
  3: "thu",
  4: "fri",
  5: "sat",
  6: "sun",
  7: "finished",
};
var state_num = {
  0: "연재중",
  1: "업로드",
  2: "휴재중",
  3: "완결",
};
var api_category = {
  "/": "API INFO",
  "/mon": "월요일 웹툰",
  "/tue": "화요일 웹툰",
  "/wed": "수요일 웹툰",
  "/thu": "목요일 웹툰",
  "/fri": "금요일 웹툰",
  "/sat": "토요일 웹툰",
  "/sun": "일요일 웹툰",
  "/finished": "완결 웹툰",
  "/all": "전체 웹툰",
};
var webtoon_info_weekday = [];
var webtoon_info_all;

var timestamp = {};
var api_info = {
  UpdateTime: timestamp,
  Weekday: weekday_num,
  State: state_num,
  APIcategory: api_category,
};
let workerPath_1 = path.join(__dirname, "./worker/naver_finished.js");
let workerPath_2 = path.join(__dirname, "./worker/naver_weekday.js");
let workerPath_3 = path.join(__dirname, "./worker/daum_all.js");

//호스팅 시작과 동시에 전체 데이터 1회 업데이트
hosting_start();
naver_overall_update();
naver_partial_update();
daum_overall_update();

//1분 간격으로 전체 네이버 data 업데이트
setInterval(function () {
  naver_overall_update();
}, sec(60));
//30초 간격으로 연재중 네이버 data 업데이트
setInterval(function () {
  naver_partial_update();
}, sec(30));
//1분 간격으로 전체 다음 data 업데이트
setInterval(function () {
  daum_overall_update();
}, sec(60));
//10초 간격으로 전체 data 통합 & log 출력
setInterval(function () {
  integrate_db();
  console.log(timestamp);
}, sec(10));

//json 형식으로 웹에 배포
function hosting_start() {
  var app = express();
  app.use(cors());
  app.get("/", function (request, response) {
    response.json(api_info);
  });
  app.get("/all", function (request, response) {
    response.json(webtoon_info_all);
  });

  //왜인지 모르겠으나 for문으로 돌릴시 주소는 생성되나 값이 제대로 안들어감, 비동기식으로 돌아가거나 배열에 접근하지 못한듯..
  app.get("/" + weekday_num[0], function (request, response) {
    response.json(webtoon_info_weekday[0]);
  });
  app.get("/" + weekday_num[1], function (request, response) {
    response.json(webtoon_info_weekday[1]);
  });
  app.get("/" + weekday_num[2], function (request, response) {
    response.json(webtoon_info_weekday[2]);
  });
  app.get("/" + weekday_num[3], function (request, response) {
    response.json(webtoon_info_weekday[3]);
  });
  app.get("/" + weekday_num[4], function (request, response) {
    response.json(webtoon_info_weekday[4]);
  });
  app.get("/" + weekday_num[5], function (request, response) {
    response.json(webtoon_info_weekday[5]);
  });
  app.get("/" + weekday_num[6], function (request, response) {
    response.json(webtoon_info_weekday[6]);
  });
  app.get("/" + weekday_num[7], function (request, response) {
    response.json(webtoon_info_weekday[7]);
  });

  app.listen(process.env.PORT || 8080, function () {
    console.log("webtoon api hosting started on port 8080.");
  });
}

//네이버 완결 data 업데이트
function naver_overall_update() {
  let naver_finished = new Worker(workerPath_1);
  naver_finished.on("message", (naver_finished_result) => {
    naver_info = naver_finished_result;
  });
  timestamp.naver_overall_update = new Date();
}

//네이버 연재중 data 업데이트
function naver_partial_update() {
  let naver_weekday = new Worker(workerPath_2);
  naver_weekday.on("message", (naver_weekday_result) => {
    naver_weekday_info = naver_weekday_result;
  });
  timestamp.naver_partial_update = new Date();
}

//네이버 웹툰 정보 통합
function intergrate_naver_info() {
  naver_info = naver_info.concat(naver_weekday_info);
}

//다음 완결 포함 전체 data 업데이트
function daum_overall_update() {
  let daum_all = new Worker(workerPath_3);
  daum_all.on("message", (result_3) => {
    daum_info = result_3;
  });
  timestamp.daum_overall_update = new Date();
}

//data 분류
function integrate_db() {
  intergrate_naver_info();
  webtoon_info_all = naver_info.concat(daum_info);
  webtoon_info_all.sort(function (a, b) {
    return a.title < b.title ? -1 : 1;
  });
  for (i = 0; i < 8; i++) {
    webtoon_info_weekday[i] = webtoon_info_all.filter(function (element) {
      return element.weekday == i;
    });
  }
}

//초 단위로 변환
function sec(time) {
  return time * 1000;
}
