module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            src: [
                'client/source/class/mas/*',
                'server/*'
            ],
            all: {
            }
        },

        shell: {
            devCycle: {
                options: {
                    stdout: true,
                    stderr: true
                },
                command: 'vagrant ssh -c "sudo killall ralph.pl; cd /source/meetandspeak/ && sudo ./install.sh dev && sudo /opt/evergreen/ralph/ralph.pl -vn 1"'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-shell');

    // Default task(s).
    grunt.registerTask('default', [ 'jshint' ]);
};
