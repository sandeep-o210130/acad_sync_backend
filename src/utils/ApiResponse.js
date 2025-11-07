//setup a standard for ApiResponse

class ApiResponse {
  constructor(statusCode, data = { message: "ok" }, message = "success !") {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
  }
}

//export Apiresponse utility
export default ApiResponse;
