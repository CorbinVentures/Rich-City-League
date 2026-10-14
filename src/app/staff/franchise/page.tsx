import type {Metadata} from 'next';
import {StaffFranchiseOffice} from '@/components/StaffFranchiseOffice';
export const metadata:Metadata={title:'My RCL Franchise | Staff HQ',robots:{index:false,follow:false}};
export default function MyRCLFranchisePage(){return <StaffFranchiseOffice/>}
