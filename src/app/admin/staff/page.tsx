import type {Metadata} from 'next';
import {StaffApprovalsDesk} from '@/components/StaffApprovalsDesk';
export const metadata:Metadata={title:'RCL Staff Approvals | Administration',robots:{index:false,follow:false}};
export default function RCLStaffApprovalsPage(){return <StaffApprovalsDesk/>}
