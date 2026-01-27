import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

import dotenv from "dotenv";

dotenv.config();

const generateAccessAndRefreshToken = async (userId) => {
 try {
   const user = await User.findById(userId);
   if (!user) {
     throw new ApiError(400, "Invalid Credentials");
   }
 
   const accessToken = await user.generateAccessToken();
   const refreshToken = await user.generateRefreshToken();
 
   user.refreshToken = refreshToken;
   await user.save({ validateBeforeSave: false });
 
   return { accessToken, refreshToken };
 } catch (error) {
  console.log("Error in generateAccessAndRefreshToken user controller ------ ",error);
  throw new ApiError(
    500,
    "Something went wrong"
  );
 }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body || {};

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const isUser = await User.findOne({
    $or: [
      {
        email,
      },
      {
        username,
      },
    ],
  });

  if (isUser) {
    throw new ApiError(409, "User with email or username is already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  let avatar;

  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
  } catch (error) {
    console.log("Failed to upload avatar", error);
    throw new ApiError(500, "Failed to upload avatar");
  }

  let coverImage;

  try {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  } catch (error) {
    console.log("Failed to upload coverImage", error);
    throw new ApiError(500, "Failed to upload coverImage");
  }

  try {
    const user = await User.create({
      username: username.toLowerCase(),
      email,
      fullname,
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering a user");
    }

    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User registered successfully"));
  } catch (error) {
    console.log("User creation failed -----", error);
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id);
    }
    throw new ApiError(
      500,
      "Something went wrong while registering a user and images were deleted"
    );
  }
});

export { registerUser };
