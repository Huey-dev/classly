// fetch individual classes details
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromRequest } from "../../../../../lib/auth/getUserFromRequest";

export async function GET(request: NextRequest, {params} : {params : {id: string}}) {
	 try {
		const user = await getUserFromRequest()
		
		if (!user) {
		  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const classrooms = await prisma.classroom.findUnique({
		  where: {id: params.id}
		})
		return NextResponse.json({ classrooms }, { status: 200 });
	  } catch (error) {
		console.error("error fetching classrooms",error)
		return NextResponse.json({error: "server error"},{status:500})
	  }
 
	  
}