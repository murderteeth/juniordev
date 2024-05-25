
dev:
	@tmux new-session -d -s devenv
	@tmux splitw -h -p 60
	@tmux splitw -v -p 40
	@tmux send-keys -t devenv:0.0 '' C-m
	@tmux send-keys -t devenv:0.1 'bun run dev' C-m
	@tmux send-keys -t devenv:0.2 'ngrok http 3000' C-m
	@tmux selectp -t 0
	@tmux attach-session -t devenv

attach:
	@tmux attach-session -t devenv

down:
	-@tmux kill-server
