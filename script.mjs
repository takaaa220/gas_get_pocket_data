/**
 * アクセストークンの再発行手順
 * 1. deletePocketPropertiesForReauthorizeを実行して既存のプロパティを削除する
 * 2. getPocketAuthorizeUrlを実行する
 * 3. 取得したURLをブラウザで開いて認可する
 * 4. getPocketAccessTokenを実行してアクセストークンを取得する
 */

/** プロパティをすべて削除する */
function deletePocketPropertiesForReauthorize() {
  const userProperties = PropertiesService.getUserProperties();

  userProperties.deleteProperty("POCKET_REQUEST_TOKEN");
  userProperties.deleteProperty("POCKET_ACCESS_TOKEN");
}

/** 認可のためのURLを取得する */
function getPocketAuthorizeUrl() {
  const currentRequestToken =
    PropertiesService.getScriptProperties().getProperty("POCKET_REQUEST_TOKEN");
  if (currentRequestToken) {
    throw new Error("POCKET_REQUEST_TOKENが設定されています。");
  }

  const consumerKey = PropertiesService.getScriptProperties().getProperty(
    "POCKET_CONSUMER_KEY"
  );

  const redirectUri = "https://example.com"; // 何でもOK

  const url = "https://getpocket.com/v3/oauth/request";
  const options = {
    method: "post",
    payload: JSON.stringify({
      consumer_key: consumerKey,
      redirect_uri: redirectUri,
    }),
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "x-accept": "application/json",
    },
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  const requestToken = result.code;
  PropertiesService.getScriptProperties().setProperty(
    "POCKET_REQUEST_TOKEN",
    requestToken
  );

  const authUrl = `https://getpocket.com/auth/authorize?request_token=${requestToken}&redirect_uri=${redirectUri}`;
  Logger.log("Auth URL: " + authUrl);
}

/** アクセストークンを取得してプロパティにセットする */
function getPocketAccessToken() {
  const currentAccessToken =
    PropertiesService.getScriptProperties().getProperty("POCKET_ACCESS_TOKEN");
  if (currentAccessToken) {
    throw new Error("POCKET_ACCESS_TOKENが設定されています。");
  }

  const consumerKey = PropertiesService.getScriptProperties().getProperty(
    "POCKET_CONSUMER_KEY"
  );
  const requestToken = PropertiesService.getScriptProperties().getProperty(
    "POCKET_REQUEST_TOKEN"
  );

  const url = "https://getpocket.com/v3/oauth/authorize";
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      consumer_key: consumerKey,
      code: requestToken,
    }),
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "x-accept": "application/json",
    },
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  const accessToken = result.access_token;
  PropertiesService.getScriptProperties().setProperty(
    "POCKET_ACCESS_TOKEN",
    accessToken
  );
}

function getConsumerKey() {
  return getEnv("IS_LOCAL")
    ? getEnv("POCKET_CONSUMER_KEY")
    : PropertiesService.getScriptProperties().getProperty(
        "POCKET_CONSUMER_KEY"
      );
}

function getAccessToken() {
  return getEnv("IS_LOCAL")
    ? getEnv("POCKET_ACCESS_TOKEN")
    : PropertiesService.getScriptProperties().getProperty(
        "POCKET_ACCESS_TOKEN"
      );
}

/**
 * @param {string} key
 * @returns {string | undefined}
 */
function getEnv(key) {
  if (typeof process !== "undefined") {
    return process.env[key];
  }

  return undefined;
}

/**
 * @param {string} url
 * @param {"get" | "post"} method
 * @param {Record<string, any>} params
 * @param {Record<string, any>} headers
 *
 */
async function request(url, method, params, headers) {
  if (getEnv("IS_LOCAL")) {
    return fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(params),
    }).then((res) => res.json());
  }

  const response = UrlFetchApp.fetch(url, {
    method,
    contentType: "application/json",
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "x-accept": "application/json",
      ...headers,
    },
    payload: JSON.stringify(params),
  });
  return JSON.parse(response.getContentText());
}

/**
 *
 * @param  {...any} args
 */
function log(...args) {
  if (getEnv("IS_LOCAL")) {
    console.log(...args);
    return;
  }

  Logger.log(...args);
}

async function getPocketData() {
  const consumerKey = getConsumerKey();
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("POCKET_ACCESS_TOKENが設定されていません。");
  }

  const response = await request(
    "https://getpocket.com/v3/get",
    "post",
    {
      consumer_key: consumerKey,
      access_token: accessToken,
      detailType: "complete",
    },
    {}
  );

  log(response);
}

getPocketData();
