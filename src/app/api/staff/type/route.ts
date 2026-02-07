import { NextRequest, NextResponse } from 'next/server';
import { staffTypeService } from '@/services/staff-type-service';
import { StaffType } from '@/services/staff-type-service';

/**
 * GET /api/staff/type
 * 获取工作人员类型列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const staffUserId = searchParams.get('staffUserId');

    if (staffUserId) {
      // 获取单个工作人员的类型
      const result = await staffTypeService.getStaffTypeByIdentifier(staffUserId);
      
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.staffType,
      });
    } else {
      // 获取所有工作人员类型映射
      const result = await staffTypeService.getAllStaffTypes();
      
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.staffTypes,
        count: result.staffTypes?.length || 0,
      });
    }
  } catch (error) {
    console.error('Error in GET /api/staff/type:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff/type
 * 设置工作人员类型
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.staffUserId || !body.staffType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: staffUserId, staffType',
        },
        { status: 400 }
      );
    }

    // 验证 staffType 是否有效
    const validTypes: StaffType[] = ['management', 'community', 'conversion', 'after_sales', 'sales', 'notification'];
    if (!validTypes.includes(body.staffType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid staffType. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const result = await staffTypeService.setStaffType(body.staffUserId, body.staffType);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.staffType,
      message: `工作人员类型已设置为: ${body.staffType}`,
    });
  } catch (error) {
    console.error('Error in POST /api/staff/type:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/staff/type
 * 批量设置工作人员类型
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: items (array)',
        },
        { status: 400 }
      );
    }

    if (body.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'items array cannot be empty',
        },
        { status: 400 }
      );
    }

    // 验证每个项目
    const validTypes: StaffType[] = ['management', 'community', 'conversion', 'after_sales', 'sales', 'notification'];
    for (const item of body.items) {
      if (!item.staffUserId || !item.staffType) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each item must have staffUserId and staffType',
          },
          { status: 400 }
        );
      }

      if (!validTypes.includes(item.staffType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid staffType for ${item.staffUserId}. Must be one of: ${validTypes.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    const results = [];
    const errors = [];

    // 逐个处理
    for (const item of body.items) {
      const result = await staffTypeService.setStaffType(item.staffUserId, item.staffType);
      
      if (result.success) {
        results.push({
          staffUserId: item.staffUserId,
          staffType: item.staffType,
          success: true,
        });
      } else {
        results.push({
          staffUserId: item.staffUserId,
          staffType: item.staffType,
          success: false,
          error: result.error,
        });
        errors.push({
          staffUserId: item.staffUserId,
          error: result.error,
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      data: {
        results,
        successCount: results.filter(r => r.success).length,
        failureCount: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in PUT /api/staff/type:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
