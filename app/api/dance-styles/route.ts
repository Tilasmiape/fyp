import { connectDB } from '@/lib/db';
import DanceStyle from '@/models/DanceStyle';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const DEFAULT_STYLES = [
  'Bollywood',
  'Hip Hop',
  'Contemporary',
  'Classical',
  'Folk',
  'Jazz',
  'Salsa',
  'Kathak',
  'Bharatanatyam',
  'Break Dance',
  'Freestyle',
];

export async function GET() {
  try {
    await connectDB();
    
    let styles = await DanceStyle.find().sort({ name: 1 });
    
    // Auto-seed if empty
    if (styles.length === 0) {
      await DanceStyle.insertMany(DEFAULT_STYLES.map(name => ({ name })));
      styles = await DanceStyle.find().sort({ name: 1 });
    }
    
    return NextResponse.json({ success: true, styles: styles.map(s => s.name) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authToken = req.cookies.get('authToken')?.value;
    if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key') as any;
    if (decoded.role !== 'super-admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    await connectDB();
    
    // Check if exists
    const existing = await DanceStyle.findOne({ name: { $regex: new RegExp(`^${body.name.trim()}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Dance style already exists' }, { status: 400 });
    }
    
    const newStyle = await DanceStyle.create({ name: body.name.trim() });
    return NextResponse.json({ success: true, style: newStyle.name });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authToken = req.cookies.get('authToken')?.value;
    if (!authToken) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'your-secret-key') as any;
    if (decoded.role !== 'super-admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    await connectDB();
    
    const deleted = await DanceStyle.findOneAndDelete({ name: body.name });
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Dance style not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
