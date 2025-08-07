import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('fileUrl')
    const fileName = searchParams.get('fileName')
    const fileKey = searchParams.get('fileKey')
    
    if (!fileUrl || !fileName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Fetch the file from S3
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    // Get the content type from the response
    const contentType = response.headers['content-type'] || 'application/octet-stream'

    // Create response with proper headers for download
    const downloadResponse = new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': response.headers['content-length'] || '',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

    return downloadResponse
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
