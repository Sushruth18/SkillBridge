import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { scoreMentors } from '@/lib/mentorMatching';

function escapeRegex(input = '') {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const skill = (searchParams.get('skill') || '').trim();

    const query = { _id: { $ne: authUser._id }, role: 'mentor', suspended: { $ne: true } };
    if (skill) {
      const safeRegex = new RegExp(escapeRegex(skill), 'i');
      query.$or = [
        { 'skills.name': { $regex: safeRegex } },
        { skills: { $elemMatch: { $regex: safeRegex } } },
        { verifiedSkills: { $elemMatch: { $regex: safeRegex } } },
      ];
    }

    const mentors = await User.find(query).select('-password').limit(50);

    const topMentors = scoreMentors({ mentors, authUser, skill });
    return NextResponse.json({ mentors: topMentors });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const body = await request.json();
    const skills = Array.isArray(body?.skills)
      ? body.skills.map((s) => String(s).trim()).filter(Boolean)
      : [];

    const query = { _id: { $ne: authUser._id }, role: 'mentor', suspended: { $ne: true } };
    const mentors = await User.find(query).select('-password').limit(50);

    const topMentors = scoreMentors({ mentors, authUser, explicitSkills: skills });
    return NextResponse.json({ mentors: topMentors });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
