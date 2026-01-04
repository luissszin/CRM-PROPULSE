import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const AdminMessages = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: messages = [], isLoading, error } = useQuery({
        queryKey: ['admin-messages'],
        queryFn: async () => {
            const res = await api.getAdminMessages();
            return res.messages || [];
        }
    });

    const resendMutation = useMutation({
        mutationFn: (id: string) => api.resendMessage(id),
        onSuccess: () => {
            toast({ title: "Message resent" });
            queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
        },
        onError: () => {
            toast({ title: "Failed to resend", variant: "destructive" });
        }
    });

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (error) return <div className="p-8 text-red-500">Error loading messages</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Admin Messages</h1>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-messages'] })} variant="outline">
                    <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>

            <div className="space-y-4">
                {messages.map((msg: any) => (
                    <div key={msg.id} className="border p-4 rounded-lg flex justify-between items-start">
                        <div>
                            <p className="font-semibold">{msg.sender}</p>
                            <p>{msg.content}</p>
                            <p className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleString()}</p>
                            <p className={`text-xs ${msg.status === 'failed' ? 'text-red-500' : 'text-green-500'}`}>
                                Status: {msg.status}
                            </p>
                        </div>
                        {msg.status === 'failed' && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => resendMutation.mutate(msg.id)}
                                disabled={resendMutation.isPending}
                            >
                                {resendMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4 mr-2" />}
                                Resend
                            </Button>
                        )}
                    </div>
                ))}
                {messages.length === 0 && <p>No messages found.</p>}
            </div>
        </div>
    );
};

export default AdminMessages;
