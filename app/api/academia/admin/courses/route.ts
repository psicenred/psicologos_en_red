import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import {
  adminDeleteLesson,
  adminDeleteModule,
  adminUpsertLesson,
  adminUpsertModule,
  createCourse,
  deleteCourse,
  listAllCourses,
  updateCourse,
} from '@/lib/academia/courses';

export async function GET() {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const courses = await listAllCourses();
  return NextResponse.json({ courses });
}

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const instructorIds = Array.isArray(body.instructor_ids)
    ? body.instructor_ids.map((id: unknown) => String(id).trim()).filter(Boolean)
    : [];
  const legacyInstructorId = String(body.instructor_id ?? '').trim();
  if (legacyInstructorId && !instructorIds.includes(legacyInstructorId)) {
    instructorIds.unshift(legacyInstructorId);
  }
  if (instructorIds.length === 0) {
    return NextResponse.json({ error: 'Debes asignar al menos un instructor' }, { status: 400 });
  }

  const course = await createCourse(instructorIds, {
    title: String(body.title ?? 'Nuevo curso'),
    description: body.description,
    curriculum: body.curriculum,
    format: body.format === 'sync' ? 'sync' : 'async',
    status: body.status === 'published' ? 'published' : 'draft',
    price_full: body.price_full != null ? Number(body.price_full) : null,
    price_monthly: body.price_monthly != null ? Number(body.price_monthly) : null,
    duration_months: body.duration_months != null ? Number(body.duration_months) : undefined,
    category: body.category,
    level: body.level,
    thumbnail_url: body.thumbnail_url,
  });

  return NextResponse.json({ course });
}

export async function PATCH(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const courseId = String(body.id ?? '');
  if (!courseId) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const course = await updateCourse(courseId, {
    title: body.title,
    description: body.description,
    curriculum: body.curriculum,
    format: body.format,
    status: body.status,
    price_full: body.price_full != null ? Number(body.price_full) : undefined,
    price_monthly: body.price_monthly != null ? Number(body.price_monthly) : undefined,
    duration_months: body.duration_months != null ? Number(body.duration_months) : undefined,
    category: body.category,
    level: body.level,
    thumbnail_url: body.thumbnail_url,
    instructor_id: body.instructor_id,
    instructor_ids: Array.isArray(body.instructor_ids)
      ? body.instructor_ids.map((id: unknown) => String(id).trim()).filter(Boolean)
      : undefined,
    grading_mode:
      body.grading_mode === 'pass_fail' || body.grading_mode === 'weighted'
        ? body.grading_mode
        : undefined,
    attendance_weight_pct:
      body.attendance_weight_pct != null ? Number(body.attendance_weight_pct) : undefined,
  });

  return NextResponse.json({ course });
}

export async function PUT(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action as string;

  if (action === 'upsert_module') {
    const id = await adminUpsertModule(body.courseId, {
      id: body.module?.id,
      title: body.module.title,
      order_index: Number(body.module.order_index ?? 0),
    });
    return NextResponse.json({ id });
  }

  if (action === 'upsert_lesson') {
    const id = await adminUpsertLesson(body.moduleId, {
      id: body.lesson?.id,
      title: body.lesson.title,
      content_type: body.lesson.content_type ?? 'text',
      text_content: body.lesson.text_content,
      video_url: body.lesson.video_url,
      pdf_url: body.lesson.pdf_url,
      order_index: Number(body.lesson.order_index ?? 0),
    });
    return NextResponse.json({ id });
  }

  if (action === 'delete_module') {
    await adminDeleteModule(body.moduleId);
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete_lesson') {
    await adminDeleteLesson(body.lessonId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}

export async function DELETE(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const courseId = new URL(request.url).searchParams.get('id');
  if (!courseId) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  try {
    await deleteCourse(courseId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
