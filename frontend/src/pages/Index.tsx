import LoginLeftPanel from "@/components/Index/LoginLeftPanel";
import LoginRightPanel from "@/components/Index/LoginRightPanel";

const Index = () => {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden">
      <LoginLeftPanel />
      <LoginRightPanel />
    </div>
  );
};

export default Index;
