import Blob "mo:core/Blob";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";

module {
  func concatHeaders(a : [HttpHeader], b : [HttpHeader]) : [HttpHeader] {
    Array.tabulate<HttpHeader>(
      a.size() + b.size(),
      func(i) {
        if (i < a.size()) { a[i] } else { b[i - a.size()] };
      },
    );
  };
  // Types matching the IC management canister interface
  public type HttpHeader = {
    name : Text;
    value : Text;
  };

  public type HttpRequestResult = {
    status : Nat;
    headers : [HttpHeader];
    body : Blob;
  };

  public type TransformationInput = {
    response : HttpRequestResult;
    context : Blob;
  };

  public type TransformationOutput = HttpRequestResult;

  public type HttpMethod = {
    #get;
    #head;
    #post;
  };

  public type TransformFunction = shared query (TransformationInput) -> async TransformationOutput;

  public type TransformContext = {
    function : TransformFunction;
    context : Blob;
  };

  public type HttpRequestArgs = {
    url : Text;
    max_response_bytes : ?Nat64;
    method : HttpMethod;
    headers : [HttpHeader];
    body : ?Blob;
    transform : ?TransformContext;
  };

  // Default transform function - returns response with headers stripped for consensus
  public func transform(input : TransformationInput) : TransformationOutput {
    {
      status = input.response.status;
      headers = [];
      body = input.response.body;
    };
  };

  // Make an HTTP GET request and return the response body as Text
  public func httpGetRequest(
    url : Text,
    extraHeaders : [HttpHeader],
    transformFn : TransformFunction,
  ) : async Text {
    let ic : actor {
      http_request : HttpRequestArgs -> async HttpRequestResult;
    } = actor ("aaaaa-aa");

    let requestHeaders : [HttpHeader] = concatHeaders(
      [
        { name = "User-Agent"; value = "ic-canister" },
        { name = "Accept"; value = "application/json" },
      ],
      extraHeaders,
    );

    let request : HttpRequestArgs = {
      url;
      max_response_bytes = ?2_000_000;
      method = #get;
      headers = requestHeaders;
      body = null;
      transform = ?{
        function = transformFn;
        context = Blob.fromArray([]);
      };
    };

    // Make HTTP request with cycles attached
    let response = await (with cycles = 230_949_972_000) ic.http_request(request);

    if (response.status >= 200 and response.status < 300) {
      switch (response.body.decodeUtf8()) {
        case (null) { "Error: Failed to decode response as UTF-8" };
        case (?text) { text };
      };
    } else {
      "Error: HTTP " # debug_show (response.status);
    };
  };

  // Make an HTTP POST request and return the response body as Text
  public func httpPostRequest(
    url : Text,
    extraHeaders : [HttpHeader],
    body : Text,
    transformFn : TransformFunction,
  ) : async Text {
    let ic : actor {
      http_request : HttpRequestArgs -> async HttpRequestResult;
    } = actor ("aaaaa-aa");

    let requestHeaders : [HttpHeader] = concatHeaders(
      [
        { name = "User-Agent"; value = "ic-canister" },
        { name = "Content-Type"; value = "application/json" },
        { name = "Idempotency-Key"; value = "Time-" # Time.now().toText() },
      ],
      extraHeaders,
    );

    let request : HttpRequestArgs = {
      url;
      max_response_bytes = ?2_000_000;
      method = #post;
      headers = requestHeaders;
      body = ?body.encodeUtf8();
      transform = ?{
        function = transformFn;
        context = Blob.fromArray([]);
      };
    };

    // Make HTTP request with cycles attached
    let response = await (with cycles = 230_949_972_000) ic.http_request(request);

    if (response.status >= 200 and response.status < 300) {
      switch (response.body.decodeUtf8()) {
        case (null) { "Error: Failed to decode response as UTF-8" };
        case (?text) { text };
      };
    } else {
      "Error: HTTP " # debug_show (response.status);
    };
  };
};
