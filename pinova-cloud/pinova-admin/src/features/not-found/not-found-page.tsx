import { Result } from "antd";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="页面未找到"
      extra={<Link to="/overview">返回概览</Link>}
    />
  );
}

