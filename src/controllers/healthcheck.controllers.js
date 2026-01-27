import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthCheck = asyncHandler(async (req, res) => {
  return res.json(new ApiResponse(200, "OK", "Health checked passed"));
});

export { healthCheck };
