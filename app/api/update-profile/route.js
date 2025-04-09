import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "../../lib/firebase-admin";

export async function POST(request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, username, bio, status, profileImage, bannerImage } =
      await request.json();

    if (!userId || !username) {
      return NextResponse.json(
        { error: "User ID and username are required" },
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

    // Find the user document
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user document with profile data
    await userRef.update({
      bio: bio || null,
      status: status || null,
      profileImage: profileImage || userDoc.data().image || null,
      bannerImage: bannerImage || null,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
