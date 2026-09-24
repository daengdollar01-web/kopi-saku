import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAuth = createClient(
  supabaseUrl,
  publishableKey
)

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
)

export async function POST(request: NextRequest) {
  try {
    // Ambil token login dari browser
    const authorization = request.headers.get('authorization')

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      )
    }

    const accessToken = authorization.replace('Bearer ', '')

    // Cek user yang sedang login
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(accessToken)

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Sesi login tidak valid' },
        { status: 401 }
      )
    }

    // Pastikan yang membuat akun adalah Master
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

    if (
      profileError ||
      !profile ||
      profile.role !== 'master' ||
      !profile.is_active
    ) {
      return NextResponse.json(
        { error: 'Hanya Master yang dapat membuat akun' },
        { status: 403 }
      )
    }

    // Ambil data akun baru
    const body = await request.json()

    const email = body.email?.trim()
    const password = body.password
    const fullName = body.full_name?.trim()
    const role = body.role

    // Validasi
    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Nama, email, password, dan role wajib diisi' },
        { status: 400 }
      )
    }

    if (!['owner', 'manager', 'kasir'].includes(role)) {
      return NextResponse.json(
        { error: 'Role tidak valid' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    // Buat akun Authentication
    const {
      data: newUserData,
      error: createUserError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createUserError || !newUserData.user) {
      return NextResponse.json(
        {
          error:
            createUserError?.message ||
            'Gagal membuat akun',
        },
        { status: 400 }
      )
    }

    const newUser = newUserData.user

    // Buat profile akun
    const { error: insertProfileError } =
      await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.id,
          full_name: fullName,
          role,
          is_active: true,
        })

    // Jika profile gagal dibuat, hapus akun Authentication
    if (insertProfileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id)

      return NextResponse.json(
        {
          error:
            'Akun berhasil dibuat tetapi profile gagal disimpan',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Akun ${role} berhasil dibuat`,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: fullName,
        role,
      },
    })
  } catch (error) {
    console.error('Create user error:', error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
