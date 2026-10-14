import type {Metadata} from 'next';
import {StaffFranchiseOffice} from '@/components/StaffFranchiseOffice';
export const metadata:Metadata={title:'My RCL Franchise | Staff HQ',robots:{index:false,follow:false}};
export default async function MyRCLFranchisePage({searchParams}:{searchParams:Promise<{team?:string}>}){const {team}=await searchParams;return <StaffFranchiseOffice initialTeamId={typeof team==='string'?team:''}/>}
