import { NextRequest, NextResponse } from 'next/server';
import { staffTypeService, StaffType } from '@/services/staff-type-service';

/**
 * GET /api/staff/type - 获取工作人员类型
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffUserId = searchParams.get('staffUserId');

    if (!staffUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: staffUserId' },
        { status: 400 }
      );
    }

    const staffType = await staffTypeService.getStaffType(staffUserId);

    if (!staffType) {
      return NextResponse.json(
        { success: false, error: 'Staff not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        staffUserId,
        staffType,
      },
    });
  } catch (error) {
    console.error('[API] 获取工作人员类型失败:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff/type - 设置工作人员类型
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffUserId, staffType } = body;

    if (!staffUserId || !staffType) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: staffUserId, staffType' },
        { status: 400 }
      );
    }

    if (!Object.values(StaffType).includes(staffType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid staff type' },
        { status: 400 }
      );
    }

    const result = await staffTypeService.setStaffType(staffUserId, staffType);

    if (result) {
      return NextResponse.json({
        success: true,
        data: {
          staffUserId,
          staffType,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to set staff type' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] 设置工作人员类型失败:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
