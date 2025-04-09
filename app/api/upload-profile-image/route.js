import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary (you'll need to add these to your .env file)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { image, type, userId } = await request.json();

    if (!image || !type || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify it's the user's own profile
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: "Cannot modify another user's profile" },
        { status: 403 }
      );
    }

    // Process the image (base64 data)
    if (!image.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 }
      );
    }

    // Upload to Cloudinary with optimizations
    const folder = `lockchain/profiles/${userId}`;
    const uploadOptions = {
      folder,
      resource_type: "image",
      transformation:
        type === "profile"
          ? [{ width: 500, height: 500, crop: "fill", gravity: "face" }]
          : [{ width: 1500, height: 500, crop: "fill" }],
      format: "webp",
      quality: "auto:good",
    };

    const uploadResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(image, uploadOptions, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
