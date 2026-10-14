import type {Metadata} from 'next';
import {StaffRolePortal} from '@/components/StaffRolePortal';
export const metadata:Metadata={title:'RCL Staff HQ | Rich City Hoops',description:'Request and manage official Rich City League coaching, accounting, production, cheerleading, referee and franchise assignments.',robots:{index:false,follow:false}};
export default function RCLStaffPage(){return <StaffRolePortal/>}
