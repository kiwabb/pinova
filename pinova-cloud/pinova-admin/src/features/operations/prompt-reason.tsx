import { Input, Modal } from "antd";
export function promptReason(title:string,onConfirm:(reason:string)=>Promise<unknown>){let reason="";Modal.confirm({title,content:<Input.TextArea aria-label="操作原因" rows={4} onChange={(e)=>{reason=e.target.value}} />,okText:"确认",cancelText:"取消",onOk:async()=>{if(!reason.trim())throw new Error("请填写操作原因");await onConfirm(reason.trim());}});}
