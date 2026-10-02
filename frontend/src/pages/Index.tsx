import LoginLeftPanel from "@/components/Index/LoginLeftPanel";
import LoginRightPanel from "@/components/Index/LoginRightPanel";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">

      <div className="flex w-full max-w-full">
      <LoginLeftPanel />
      <LoginRightPanel />
      </div>
    </div>
  );
};

export default Index;
